"""
API Ledger Routes - Simple version with Viyonapay prefix filtering
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db_connection

api_ledger_bp = Blueprint('api_ledger', __name__, url_prefix='/api/api-ledger')

@api_ledger_bp.route('/apis', methods=['GET'])
@jwt_required()
def get_apis():
    """Get list of APIs from service routing"""
    try:
        service_type = request.args.get('service_type', 'PAYIN')
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Get unique PG partners for the service type
        cursor.execute("""
            SELECT DISTINCT pg_partner
            FROM service_routing
            WHERE service_type = %s
            ORDER BY pg_partner
        """, (service_type,))
        
        apis = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Filter and rename APIs based on service type
        api_list = []
        for api in apis:
            pg_partner = api['pg_partner']
            
            if pg_partner.lower() == 'payu':
                api_list.append({'id': 'PayU', 'name': 'SERVER DOWN'})
            elif pg_partner.lower() == 'singpay':
                api_list.append({'id': 'Singpay', 'name': 'Singpay'})
            else:
                api_list.append({'id': pg_partner, 'name': pg_partner})
        
        return jsonify({'success': True, 'apis': api_list}), 200
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@api_ledger_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_api_stats():
    """Get transaction statistics for a specific API"""
    try:
        api_name = request.args.get('api_name')
        service_type = request.args.get('service_type', 'PAYIN')
        period = request.args.get('period', 'today')
        
        if not api_name:
            return jsonify({'success': False, 'message': 'API name required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Determine date condition
        if period == 'today':
            date_condition = "DATE(created_at) = CURDATE()"
        elif period == 'yesterday':
            date_condition = "DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"
        elif period == 'last_7_days':
            date_condition = "DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
        elif period == 'last_30_days':
            date_condition = "DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
        else:
            date_condition = "DATE(created_at) = CURDATE()"
        
        # Get statistics
        if service_type == 'PAYIN':
            table = 'payin_transactions'
            net_formula = 'amount - COALESCE(charge_amount, 0)'  # Merchant receives less
        else:
            table = 'payout_transactions'
            net_formula = 'amount + COALESCE(charge_amount, 0)'  # Wallet deduction is more
        
        # Map renamed API names back to database names
        db_api_name = api_name
        
        where_condition = f"pg_partner = %s AND {date_condition}"
        needs_parameter = True
        
        query = f"""
            SELECT 
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as success_count,
                COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END), 0) as total_amount,
                COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN ({net_formula}) ELSE 0 END), 0) as total_net_amount
            FROM {table}
            WHERE {where_condition}
        """
        
        if needs_parameter:
            cursor.execute(query, (db_api_name,))
        else:
            cursor.execute(query)
        
        stats = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_transactions': stats['total_transactions'],
                'success_count': stats['success_count'],
                'total_amount': float(stats['total_amount']),
                'total_net_amount': float(stats['total_net_amount'])
            }
        }), 200
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@api_ledger_bp.route('/merchant-wise', methods=['GET'])
@jwt_required()
def get_merchant_wise_stats():
    """Get merchant-wise statistics for a specific API"""
    try:
        api_name = request.args.get('api_name')
        service_type = request.args.get('service_type', 'PAYIN')
        period = request.args.get('period', 'today')
        
        if not api_name:
            return jsonify({'success': False, 'message': 'API name required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Determine date condition
        if period == 'today':
            date_condition = "DATE(t.created_at) = CURDATE()"
        elif period == 'yesterday':
            date_condition = "DATE(t.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"
        elif period == 'last_7_days':
            date_condition = "DATE(t.created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
        elif period == 'last_30_days':
            date_condition = "DATE(t.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
        else:
            date_condition = "DATE(t.created_at) = CURDATE()"
        
        # Get merchant-wise statistics
        if service_type == 'PAYIN':
            table = 'payin_transactions'
            net_formula = 't.amount - COALESCE(t.charge_amount, 0)'
        else:
            table = 'payout_transactions'
            net_formula = 't.amount + COALESCE(t.charge_amount, 0)'
        
        # Map renamed API names back to database names
        db_api_name = api_name
        
        where_condition = f"t.pg_partner = %s AND {date_condition}"
        needs_parameter = True
        
        query = f"""
            SELECT 
                t.merchant_id,
                m.full_name as merchant_name,
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN t.status = 'SUCCESS' THEN 1 END) as success_count,
                COALESCE(SUM(CASE WHEN t.status = 'SUCCESS' THEN t.amount ELSE 0 END), 0) as total_amount,
                COALESCE(SUM(CASE WHEN t.status = 'SUCCESS' THEN ({net_formula}) ELSE 0 END), 0) as total_net_amount
            FROM {table} t
            LEFT JOIN merchants m ON t.merchant_id = m.merchant_id
            WHERE {where_condition}
            GROUP BY t.merchant_id, m.full_name
            ORDER BY total_net_amount DESC
        """
        
        if needs_parameter:
            cursor.execute(query, (db_api_name,))
        else:
            cursor.execute(query)
        
        merchant_stats = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Format response
        result = []
        for stat in merchant_stats:
            result.append({
                'merchant_id': stat['merchant_id'],
                'merchant_name': stat['merchant_name'] or stat['merchant_id'],
                'total_transactions': stat['total_transactions'],
                'success_count': stat['success_count'],
                'total_amount': float(stat['total_amount']),
                'total_net_amount': float(stat['total_net_amount'])
            })
        
        return jsonify({'success': True, 'merchant_stats': result}), 200
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500
